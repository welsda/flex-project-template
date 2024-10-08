import { Manager } from '@twilio/flex-ui';

import ApiService from '../ApiService';
import { EncodedParams } from '../../../types/serverless';

export interface PhoneNumberItem {
  friendlyName: string;
  phoneNumber: string;
}

export interface ListPhoneNumbersResponse {
  success: boolean;
  phoneNumbers: Array<PhoneNumberItem>;
  expiry: number;
}

export interface ValidatePhoneNumberResponse {
  lookupResponse: any;
  success: boolean;
  valid: boolean;
  invalidReason?: string;
}

class PhoneNumberService extends ApiService {
  private flex_service_instance_sid = Manager.getInstance().serviceConfiguration.flex_service_instance_sid;

  private STORAGE_KEY_FLEX_PHONE_NUMBERS = `FLEX_PHONE_NUMBERS_${this.flex_service_instance_sid}`;

  private STORAGE_KEY_FLEX_PHONE_NUMBERS_WITH_OUTGOING = `FLEX_PHONE_NUMBERS_WITH_OUTGOING_${this.flex_service_instance_sid}`;

  private STORAGE_KEY_VALIDATED_NUMBERS = `FLEX_VALIDATED_NUMBERS`;

  private EXPIRY = 86400000; // 1 day

  async getAccountPhoneNumbers(includeOutgoing: boolean): Promise<ListPhoneNumbersResponse> {
    // look for value in storage first
    const cachedResult = JSON.parse(
      localStorage.getItem(
        includeOutgoing ? this.STORAGE_KEY_FLEX_PHONE_NUMBERS_WITH_OUTGOING : this.STORAGE_KEY_FLEX_PHONE_NUMBERS,
      ) || '{}',
    );
    // if storage value has expired, discard
    if (cachedResult.expiry < new Date().getTime()) cachedResult.success = false;
    // if we have a valid storage value use it, otherwise get from backend.
    return cachedResult.success ? cachedResult : this.#getAccountPhoneNumbers(includeOutgoing);
  }

  async validatePhoneNumber(phoneNumber: string): Promise<ValidatePhoneNumberResponse> {
    // look for value in storage first
    const cachedResult = JSON.parse(localStorage.getItem(this.#getTransferNumberKey(phoneNumber)) || '{}');

    // if we have a valid storage value use it, otherwise get from backend.
    return cachedResult.success ? cachedResult : this.#validatePhoneNumber(phoneNumber);
  }

  #getAccountPhoneNumbers = async (includeOutgoing: boolean): Promise<any> => {
    const encodedParams: EncodedParams = {
      Token: encodeURIComponent(this.manager.user.token),
      IncludeOutgoing: encodeURIComponent(includeOutgoing),
    };

    return this.fetchJsonWithReject<ListPhoneNumbersResponse>(
      `${this.serverlessProtocol}://${this.serverlessDomain}/common/flex/phone-numbers/list-phone-numbers`,
      {
        method: 'post',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.buildBody(encodedParams),
      },
    ).then((response): ListPhoneNumbersResponse => {
      // if response from service was successful, store it
      if (response.success)
        localStorage.setItem(
          includeOutgoing ? this.STORAGE_KEY_FLEX_PHONE_NUMBERS_WITH_OUTGOING : this.STORAGE_KEY_FLEX_PHONE_NUMBERS,
          JSON.stringify({
            ...response,
            expiry: new Date().getTime() + this.EXPIRY,
          }),
        );
      return {
        ...response,
      };
    });
  };

  #getTransferNumberKey = (phoneNumber: string): string => {
    return `${this.STORAGE_KEY_VALIDATED_NUMBERS}_${phoneNumber}`;
  };

  #validatePhoneNumber = async (phoneNumber: string): Promise<ValidatePhoneNumberResponse> => {
    const encodedParams: EncodedParams = {
      Token: encodeURIComponent(this.manager.user.token),
      phoneNumber: encodeURIComponent(phoneNumber),
    };

    return this.fetchJsonWithReject<ValidatePhoneNumberResponse>(
      `${this.serverlessProtocol}://${this.serverlessDomain}/common/flex/phone-numbers/validate-phone-number`,
      {
        method: 'post',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.buildBody(encodedParams),
      },
    ).then((response): ValidatePhoneNumberResponse => {
      // if response from service was successful, store it
      if (response.success)
        localStorage.setItem(
          this.#getTransferNumberKey(phoneNumber),
          JSON.stringify({
            ...response,
          }),
        );
      return {
        ...response,
      };
    });
  };
}

export default new PhoneNumberService();
