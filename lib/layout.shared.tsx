import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { ReactNode } from 'react';

const pipelineLink = {
  text: 'Pipeline 状态',
  url: '/admin/pipeline-status',
};

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: 'Bili-Docs',
  },
  links: [
    pipelineLink,
    {
      text: 'Keystatic CMS',
      url: '/keystatic',
    },
  ],
};

export function getDocsLayoutOptions(
  admin: boolean,
  navChildren?: ReactNode,
): BaseLayoutProps {
  const links = admin
    ? baseOptions.links
    : [
        pipelineLink,
        {
          text: '管理员登录',
          url: '/admin/login?next=%2Fdocs',
        },
      ];

  return {
    ...baseOptions,
    links,
    nav: {
      ...baseOptions.nav,
      children: navChildren,
    },
  };
}
