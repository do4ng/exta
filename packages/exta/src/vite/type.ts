import {
  PAGE_STATIC_DATA_FUNCTION,
  PAGE_STATIC_PARAMS_FUNCTION,
} from '~/compiler/constants';

// server

export interface StaticPropsContext {
  params: Record<string, string>;
}

export type StaticParamsOutput<T> = Array<T>;

export type StaticPropsFC<T = any> = (ctx: StaticPropsContext) => Promise<T> | T;
export type StaticParamsFC<T = Record<string, string>> = () =>
  | Promise<StaticParamsOutput<T>>
  | StaticParamsOutput<T>;

export type ServerModule = {
  [PAGE_STATIC_DATA_FUNCTION]: StaticPropsFC;
  [PAGE_STATIC_PARAMS_FUNCTION]: StaticParamsFC;
};

// client

export interface PageProps<PropsType = any, ParamsType = Record<string, string>> {
  params: ParamsType;
  props: PropsType;
}

export type ExtaPage<PropsType = any, ParamsType = Record<string, string>> = (
  props: PageProps<PropsType, ParamsType>,
) => React.ReactNode;

export type ExtaLayout = (props: { children: React.ReactNode }) => React.ReactNode;
