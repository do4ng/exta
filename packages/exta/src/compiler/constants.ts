/*
  The structure of the following functions is inspired by Next.js.

  export function getStaticParams(context) {
    return { name: ["1", "2"] }
  }
  export function getStaticProps(context) {
    return {
      message: `Hello ${context.params.name}`
    }
  }
*/

export const PAGE_STATIC_DATA_FUNCTION = 'getStaticProps';
export const PAGE_STATIC_PARAMS_FUNCTION = 'getStaticParams';
