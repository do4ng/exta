import { Link } from 'exta/components';

export default function ({ children }) {
  return (
    <>
      <nav>
        <Link href="/">Home</Link>
        <Link href="/post/1">Post 1</Link>
        <Link href="/post/2">Post 2</Link>
      </nav>

      <div>{children}</div>
    </>
  );
}
