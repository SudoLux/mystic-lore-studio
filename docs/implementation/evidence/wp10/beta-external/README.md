# Isolated beta evidence contract

Do not copy the examples to the required filenames until the checks have been
performed. `npm run audit:beta` requires these four files in this directory:

- `cross-device.json`
- `backup-restore.json`
- `accessibility-manual.json`
- `deployed-performance.json`

Minimum shapes:

```json
{"passed":true,"outboxEmpty":true,"secondDeviceMatched":true,"unauthorizedDenied":true,"anonymousDenied":true,"operator":"name","testedAt":"ISO timestamp"}
```

```json
{"passed":true,"databaseChecksum":"sha256","restoredDatabaseChecksum":"sha256","storageChecksum":"sha256","restoredStorageChecksum":"sha256","operator":"name","restoredProjectRef":"ref","testedAt":"ISO timestamp"}
```

```json
{"passed":true,"voiceOverSafari":true,"nvdaFirefox":true,"reflow200":true,"physicalTouch":true,"operator":"name","testedAt":"ISO timestamp"}
```

```json
{"passed":true,"lcpP75Ms":0,"inpP75Ms":0,"clsP75":0,"grid1000RowsMeasured":true,"mediaScenarioMeasured":true,"deployUrl":"https://…","testedAt":"ISO timestamp"}
```

The audit also requires isolated beta URL, anon/service keys, project ref,
Studio ID, and `ML_BETA_CONFIRM_ISOLATED=true`. It refuses the configured
production project reference and writes a checksum-only gate report to
`../beta-audit-evidence.json`.
