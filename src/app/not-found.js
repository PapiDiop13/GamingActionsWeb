import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] text-center px-4">
      <div>
        <p className="text-6xl mb-4">🎮</p>
        <h1 className="text-3xl font-black text-[#E8F5EE] mb-2">404</h1>
        <p className="text-[#4A7A5A] mb-6">Page introuvable</p>
        <Link href="/" className="btn-primary">Retour au feed</Link>
      </div>
    </div>
  );
}
