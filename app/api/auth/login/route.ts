import { NextRequest, NextResponse } from 'next/server';
import {
  createLoginSessionCookie,
  isAdminAuthConfigured,
  verifyAdminPassword,
} from '@/lib/auth';

type LoginRequestBody = {
  password?: string;
};

export async function POST(request: NextRequest) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ error: '未配置 ADMIN_PASSWORD' }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as LoginRequestBody;
  const password = typeof body.password === 'string' ? body.password : '';
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }

  const sessionCookie = createLoginSessionCookie();
  if (!sessionCookie) {
    return NextResponse.json({ error: '服务端会话配置错误' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie);
  return response;
}
