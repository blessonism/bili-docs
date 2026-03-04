import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import KeystaticApp from '../keystatic';

type SearchParamValue = string | string[] | undefined;

function buildNextPath(
  routeParams: string[] | undefined,
  searchParams: Record<string, SearchParamValue>,
): string {
  const basePath = routeParams?.length
    ? `/keystatic/${routeParams.map((segment) => encodeURIComponent(segment)).join('/')}`
    : '/keystatic';

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      query.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    }
  }

  const queryText = query.toString();
  return queryText ? `${basePath}?${queryText}` : basePath;
}

export default async function Page(props: PageProps<'/keystatic/[[...params]]'>) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const admin = await isAdmin();
  if (!admin) {
    const nextPath = buildNextPath(params.params, searchParams);
    redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
  }
  return <KeystaticApp />;
}
