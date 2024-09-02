import { getFeatureFlags } from '../../utils/configuration';
import TaskColorHandlerConfig from './types/ServiceConfiguration';

const { enabled = false } = (getFeatureFlags()?.features?.task_color_handler as TaskColorHandlerConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};
