import { useQuery } from '@tanstack/react-query'

type ProviderLogoProps = {
  providerId: string | null
  providerLogoUrl: string | null
  small?: boolean
}

async function fetchProviderLogo(providerLogoUrl: string): Promise<string> {
  const response = await fetch(providerLogoUrl, {
    headers: { Accept: 'image/svg+xml' },
  })

  if (!response.ok) {
    throw new Error(`Provider logo request failed (${response.status})`)
  }

  return response.text()
}

export function ProviderLogo({ providerId, providerLogoUrl, small = false }: ProviderLogoProps) {
  const logoQuery = useQuery({
    queryKey: ['provider-logo', providerLogoUrl],
    queryFn: () => fetchProviderLogo(providerLogoUrl ?? ''),
    enabled: Boolean(providerLogoUrl),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  })

  if (!providerLogoUrl || !providerId) {
    return null
  }

  return (
    <span
      className={small ? 'provider-logo-frame provider-logo-frame-small' : 'provider-logo-frame'}
      role="img"
      aria-label={`${providerId} provider logo`}
    >
      {logoQuery.data ? (
        <span
          className="provider-logo-svg"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: logoQuery.data }}
        />
      ) : (
        <span className="provider-logo-fallback" aria-hidden />
      )}
    </span>
  )
}
