import { useEffect, useState } from 'react';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';
import { useI18n } from '../../i18n/index.ts';
import { urlInvitation } from './deep-link.ts';

/** QR d’invitation — encode l’URL `?code=` (ADR 0017). */
export function QrCodeInvite({ code, label }: { code: string; label: string }) {
  const { t } = useI18n();
  const [src, setSrc] = useState<string | null>(null);
  const payload = urlInvitation(code);

  useEffect(() => {
    let cancelled = false;
    void qrToDataUrl(payload, {
      width: 160,
      loader: () => import('uqr'),
    })
      .then(url => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!src) {
    return <p data-quest="supporting">{t('quest.qrUnavailable')}</p>;
  }

  return (
    <figure style={{ margin: 0 }}>
      <img
        src={src}
        alt={t('quest.qrAlt', { label, code })}
        width={160}
        height={160}
      />
      <figcaption data-quest="supporting">
        {label} · {code}
      </figcaption>
    </figure>
  );
}
