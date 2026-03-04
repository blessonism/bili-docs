import { makeRouteHandler } from '@keystatic/next/route-handler';
import { NextRequest, NextResponse } from 'next/server';
import config from '../../../../keystatic.config';
import { isAdminRequest } from '@/lib/auth';

const keystaticHandler = makeRouteHandler({
  config,
});

function redirectToAdminLogin(request: NextRequest) {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return redirectToAdminLogin(request);
  }
  return keystaticHandler.GET(request);
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return redirectToAdminLogin(request);
  }
  return keystaticHandler.POST(request);
}
