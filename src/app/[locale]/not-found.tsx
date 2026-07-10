import Link from "next/link";

/**
 * @description 로케일 하위에서 존재하지 않는 경로 접근 시 표시하는 404 페이지. (App Router not-found.tsx)
 * 로케일 파라미터를 받지 못하는 컨텍스트에서도 안전하도록 한/영 병기.
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-black text-primary mb-4">404</p>
      <h1 className="text-lg font-bold text-foreground mb-2">
        페이지를 찾을 수 없습니다 · Page not found
      </h1>
      <p className="text-sm text-muted mb-6">
        요청하신 페이지가 존재하지 않습니다. · The page you requested
        doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
      >
        홈으로 · Home
      </Link>
    </div>
  );
}
