import SkyCard from './SkyCard';

// Beranda seragam untuk SEMUA tema (darkpro/light/gold/cyber):
// struktur & layout identik (SkyCard), tema hanya mengubah warna/accent via CSS vars.
export default function Home({ go }: { go: (t: string) => void }) {
  return <SkyCard go={go} />;
}
