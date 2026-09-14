export const PageLayoutMock = ({ children, title, actions, errors, isLoading }: any) => (
  <div>
    {isLoading && <div data-testid="loading" />}
    <h1>{title}</h1>
    <div data-testid="actions">{actions}</div>
    {errors?.map((e: any, i: number) => <div key={i} data-testid="page-error">{e.text}</div>)}
    {children}
  </div>
);

export { PageLayoutMock as PageLayout };
