import { encryptBackupJson, isEncryptedBackupPayload } from '../secureBackup';

describe('secure backup utilities', () => {
  it('detects encrypted backup payload wrappers', () => {
    expect(
      isEncryptedBackupPayload({
        kind: 'savings-tracker.encrypted-backup',
        version: 1,
        salt: 'salt',
        iv: 'iv',
        payload: 'payload',
      })
    ).toBe(true);

    expect(isEncryptedBackupPayload({ kind: 'other' })).toBe(false);
  });

  it('rejects weak passphrases before attempting encryption', async () => {
    await expect(encryptBackupJson('{}', 'short')).rejects.toThrow(
      'Use a backup passphrase with at least 8 characters.'
    );
  });
});
