function getTimeService() {
  return () => new Date().getTime();
}

export default getTimeService;
