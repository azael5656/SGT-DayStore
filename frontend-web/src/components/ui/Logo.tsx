import { useState } from 'react';

/**
 * Logo de Dayisaacstore.
 * Prioriza /logo.png (el logo real con el personaje — guardalo en
 * frontend-web/public/logo.png). Si no existe, cae a /logo.svg, un emblema
 * vectorial de marca (circulo negro + anillo + monograma DS naranja).
 */
export default function Logo({ size = 64 }: { size?: number }) {
  const [pngOk, setPngOk] = useState(true);
  return (
    <img
      src={pngOk ? '/logo.png' : '/logo.svg'}
      alt="Dayisaacstore"
      onError={() => setPngOk(false)}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
