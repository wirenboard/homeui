/** The app's router, so plugins navigate the way the app does (leave-page guards included). */
let router: { navigate: (_to: string) => unknown } | null = null;

export const setPluginRouter = (appRouter: typeof router) => {
  router = appRouter;
};

export const navigate = (to: string) => {
  if (router) router.navigate(to);
  else window.location.hash = `#${to}`;
};
