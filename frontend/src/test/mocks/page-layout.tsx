export const PageLayoutMock = ({ children, title, actions }: any) => (
  <div>
    <h1>{title}</h1>
    <div data-testid="actions">{actions}</div>
    {children}
  </div>
);

export { PageLayoutMock as PageLayout };
