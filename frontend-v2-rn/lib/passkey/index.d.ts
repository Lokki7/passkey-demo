import * as web from './index.web';
import * as native from './index.native';

declare var _test: typeof web;
declare var _test: typeof native;

export * from './index.native';
