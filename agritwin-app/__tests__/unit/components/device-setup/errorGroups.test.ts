import {
  errorGroup,
  needsSettings,
} from '@/components/device-setup/errorGroups';

describe('errorGroups', () => {
  it('shares one message for a wrong Wi-Fi name and a wrong password', () => {
    expect(errorGroup('wifi_not_found')).toBe('wifi');
    expect(errorGroup('wrong_password')).toBe('wifi');
  });

  it('groups the timeouts', () => {
    expect(errorGroup('wifi_timeout')).toBe('timeout');
    expect(errorGroup('no_answer')).toBe('timeout');
  });

  it('separates internet, Bluetooth and permission problems', () => {
    expect(errorGroup('no_internet')).toBe('noInternet');
    expect(errorGroup('bluetooth_off')).toBe('bluetoothOff');
    expect(errorGroup('permission_denied')).toBe('permission');
  });

  it('groups the link problems with the board', () => {
    expect(errorGroup('scan_failed')).toBe('link');
    expect(errorGroup('connection_failed')).toBe('link');
    expect(errorGroup('connection_lost')).toBe('link');
  });

  it('keeps the registration errors apart', () => {
    expect(errorGroup('already_registered_elsewhere')).toBe(
      'alreadyRegistered',
    );
    expect(errorGroup('session_expired')).toBe('sessionExpired');
    expect(errorGroup('registration_failed')).toBe('saveFailed');
  });

  it('uses the generic message for the rest and for no code', () => {
    expect(errorGroup('invalid_input')).toBe('generic');
    expect(errorGroup('missing_data')).toBe('generic');
    expect(errorGroup('bad_field_id')).toBe('generic');
    expect(errorGroup('unknown')).toBe('generic');
    expect(errorGroup(null)).toBe('generic');
  });

  it('only offers the system settings for the permission error', () => {
    expect(needsSettings('permission')).toBe(true);
    expect(needsSettings('bluetoothOff')).toBe(false);
    expect(needsSettings('wifi')).toBe(false);
  });
});
