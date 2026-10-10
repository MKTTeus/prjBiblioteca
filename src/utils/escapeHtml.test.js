import { escapeHtml } from './escapeHtml';
test('neutraliza HTML em títulos e fichas impressas', () => {
  expect(escapeHtml('<img src=x onerror="alert(1)"> & livro')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; livro');
});
