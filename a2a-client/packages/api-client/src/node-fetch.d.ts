declare module 'node-fetch' {
  function fetch(
    url: string,
    init?: RequestInit & { timeout?: number }
  ): Promise<Response>;
  export default fetch;
}
