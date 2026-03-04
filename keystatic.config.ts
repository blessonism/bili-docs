import { config, collection, fields } from '@keystatic/core';

const docSchema = {
  title: fields.slug({
    name: { label: '\u6807\u9898' },
  }),
  displayName: fields.text({
    label: '\u663e\u793a\u6807\u9898',
    description: '\u7559\u7a7a\u65f6\u4f1a\u4f7f\u7528 title \u4f5c\u4e3a\u56de\u9000\u663e\u793a',
  }),
  description: fields.text({
    label: '\u63cf\u8ff0',
    multiline: true,
  }),
  visibility: fields.select({
    label: '\u53ef\u89c1\u6027',
    defaultValue: 'public',
    options: [
      { label: '\u516c\u5f00', value: 'public' },
      { label: '\u4ec5\u7ba1\u7406\u5458', value: 'admin' },
    ],
  }),
  uploader: fields.text({
    label: 'UP\u4e3b',
  }),
  duration: fields.text({
    label: '\u65f6\u957f',
  }),
  bvUrl: fields.url({
    label: 'B\u7ad9\u94fe\u63a5',
  }),
  tags: fields.array(
    fields.text({ label: '\u6807\u7b7e' }),
    {
      label: '\u6807\u7b7e',
      itemLabel: (props) => props.value || '\u65b0\u6807\u7b7e',
    },
  ),
  pubDate: fields.text({
    label: '\u53d1\u5e03\u65e5\u671f',
    description: '\u89c6\u9891\u53d1\u5e03\u65e5\u671f (YYYY-MM-DD)',
  }),
  favDate: fields.text({
    label: '\u6536\u5f55\u65e5\u671f',
    description: '\u6536\u85cf\u65e5\u671f (YYYY-MM-DD)',
  }),
  content: fields.mdx({
    label: '\u5185\u5bb9',
  }),
};

const docFormat = {
  contentField: 'content' as const,
  data: 'yaml' as const,
};

export default config({
  storage: {
    kind: 'local',
  },
  ui: {
    brand: {
      name: '\u6587\u7a3f\u5e93\u7ba1\u7406',
    },
  },
  collections: {
    'social-wisdom': collection({
      label: '\u4eba\u60c5\u4e16\u6545',
      slugField: 'title',
      path: 'content/docs/social-wisdom/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
    'study-exam': collection({
      label: '\u5b66\u4e1a\u8003\u8bd5',
      slugField: 'title',
      path: 'content/docs/study-exam/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
    'entertainment': collection({
      label: '\u5f71\u89c6\u5a31\u4e50',
      slugField: 'title',
      path: 'content/docs/entertainment/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
    'tech-tools': collection({
      label: '\u6280\u672f\u5de5\u5177',
      slugField: 'title',
      path: 'content/docs/tech-tools/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
    'deep-content': collection({
      label: '\u6df1\u5ea6\u5185\u5bb9',
      slugField: 'title',
      path: 'content/docs/deep-content/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
    'lifestyle': collection({
      label: '\u751f\u6d3b\u65b9\u5f0f',
      slugField: 'title',
      path: 'content/docs/lifestyle/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
    'career': collection({
      label: '\u804c\u4e1a\u53d1\u5c55',
      slugField: 'title',
      path: 'content/docs/career/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
    'cognitive-growth': collection({
      label: '\u8ba4\u77e5\u6210\u957f',
      slugField: 'title',
      path: 'content/docs/cognitive-growth/**',
      format: docFormat,
      entryLayout: 'content',
      columns: ['displayName', 'uploader', 'description'],
      schema: docSchema,
    }),
  },
});
