import { config, collection, fields } from '@keystatic/core';

const docSchema = {
  title: fields.slug({
    name: { label: '\u6807\u9898' },
  }),
  displayName: fields.text({
    label: '\u663e\u793a\u6807\u9898',
    validation: { isRequired: true },
  }),
  description: fields.text({
    label: '\u63cf\u8ff0',
    multiline: true,
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
