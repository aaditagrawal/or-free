import { useResourceData } from '../hooks/useResource'
import { createResource, type Resource } from '../lib/resource'

type ProviderLogoProps = {
  providerId: string | null
  providerLogoUrl: string | null
  small?: boolean
}

async function fetchProviderLogo(providerLogoUrl: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(providerLogoUrl, {
    headers: { Accept: 'image/svg+xml' },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Provider logo request failed (${response.status})`)
  }

  return response.text()
}

const logos = new Map<string, Resource<string>>()

function getLogo(url: string): Resource<string> {
  let resource = logos.get(url)
  if (!resource) {
    resource = createResource({
      fetch: (signal) => fetchProviderLogo(url, signal),
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retries: 0,
      refreshOnFocus: true,
      cancelOnUnused: false,
      onUnused: () => logos.delete(url),
    })
    logos.set(url, resource)
  }
  return resource
}

export function ProviderLogo({ providerId, providerLogoUrl, small = false }: ProviderLogoProps) {
  const logo = useResourceData(providerLogoUrl ? getLogo(providerLogoUrl) : null)

  if (!providerLogoUrl || !providerId) {
    return null
  }

  return (
    <span
      className={small ? 'provider-logo-frame provider-logo-frame-small' : 'provider-logo-frame'}
      role="img"
      aria-label={`${providerId} provider logo`}
    >
      {logo ? (
        <span
          className="provider-logo-svg"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: logo }}
        />
      ) : (
        <span className="provider-logo-fallback" aria-hidden />
      )}
    </span>
  )
}
