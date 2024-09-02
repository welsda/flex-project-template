import { getFeatureFlags } from '../../utils/configuration';
import TaskColorHandlerConfig from './types/ServiceConfiguration';

const { 
  enabled = false,
  default_color = '#E1E3EA',
  customer_waiting_for_response_initial_color = 'green',
  customer_waiting_for_response_warning_color = 'yellow',
  customer_waiting_for_response_urgency_color = 'red',
  change_color_after_how_many_minutes = 4
} = (getFeatureFlags()?.features?.task_color_handler as TaskColorHandlerConfig) || {};

export const isFeatureEnabled = () => {
  return enabled;
};

export const getDefaultColor = () => {
  return default_color;
};

export const getCustomerWaitingForResponseInitialColor = () => {
  return customer_waiting_for_response_initial_color;
};

export const getCustomerWaitingForResponseWarningColor = () => {
  return customer_waiting_for_response_warning_color;
};

export const getCustomerWaitingForResponseUrgencyColor = () => {
  return customer_waiting_for_response_urgency_color;
};

export const getChangeColorAfterHowManyMinutes = () => {
  return change_color_after_how_many_minutes;
};
