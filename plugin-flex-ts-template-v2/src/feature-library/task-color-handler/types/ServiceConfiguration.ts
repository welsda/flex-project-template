export default interface TaskColorHandlerConfig {
  enabled: boolean;
  default_color: string,
  customer_waiting_for_response_initial_color: string,
  customer_waiting_for_response_warning_color: string,
  customer_waiting_for_response_urgency_color: string,
  change_color_after_how_many_minutes: number
}
