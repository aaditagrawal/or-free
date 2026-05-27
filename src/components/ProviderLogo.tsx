import { useQuery } from '@tanstack/react-query'
import DOMPurify from 'dompurify'

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

function sanitizeProviderLogoSvg(svg: string): string | null {
  const sanitized = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })
  return sanitized.trim() ? sanitized : null
}

export function ProviderLogo({ providerId, providerLogoUrl, small = false }: ProviderLogoProps) {
  const logoQuery = useQuery({
    queryKey: ['provider-logo', providerLogoUrl],
    queryFn: () => fetchProviderLogo(providerLogoUrl ?? ''),
    enabled: Boolean(providerLogoUrl && providerId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  })

  if (!providerLogoUrl || !providerId) {
    return null
  }

  const sanitizedSvg = logoQuery.data ? sanitizeProviderLogoSvg(logoQuery.data) : null

  return (
    <span
      className={small ? 'provider-logo-frame provider-logo-frame-small' : 'provider-logo-frame'}
      role="img"
      aria-label={`${providerId} provider logo`}
    >
      {sanitizedSvg ? (
        <span
          className="provider-logo-svg"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
        />
      ) : (
        <span className="provider-logo-fallback" aria-hidden />
      )}
    </span>
  )
}
