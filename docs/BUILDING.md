# Build and install on a Samsung TV

**English** | [한국어](ko/BUILDING.md) | [Project README](../README.md)

This repository provides a local unsigned WGT build and an optional signed build through the Samsung Tizen CLI. They have different purposes.

| Output | Command | Path | TV installation |
| --- | --- | --- | --- |
| Unsigned review packages | `npm run build` | `dist/unsigned/` | Not installable |
| WGTs signed with the TV SDK | `npm run build:signed -- --profile PROFILE` | `dist/signed/` | Can be used for an installation test when the certificate and TV conditions are met |

## Build unsigned WGTs

You need Node.js 18 or later and Python 3.9 or later. No TV SDK, network access, or certificate is needed.

```sh
npm test
npm run build
```

A WGT is a ZIP container. The build checks the app manifests, packaged web settings, ZIP integrity/CRC, app IDs, and SHA-256 manifest. These checks do not build an SDK project or create a signature trusted by a TV. Do not describe the files in `dist/unsigned/` as signed or installable.

## Install the Samsung TV SDK and sign

Install Tizen Studio with the Samsung TV extension/SDK on macOS or Windows, then confirm that its CLI is available. Samsung's CLI guide describes `tizen build-web` and `tizen package`; consult the current SDK installer for the supported extension names and versions. Linux can run the project's automated unsigned WGT build. Samsung TV registration and certificates still follow Samsung's host and developer-account requirements. [Samsung Tizen CLI](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html)

### Certificate profile

1. Enable Developer Mode on the Samsung TV, enter the host PC's address, and restart the TV.
2. In Tizen Studio Certificate Manager, choose **Samsung** and the **TV** device type. Add the connected TV's DUID to the distributor certificate's allowed devices. Select it from the connected-device list or get the DUID from the TV's Support / Contact Samsung information. [Samsung certificate guide](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)
3. Note the security profile associated with that certificate. Do not commit `author.p12`, password files, profile settings, or private keys to GitHub or this project.
4. Confirm that the SDK CLI can access the certificate profile, then run this from the repository root:

```sh
npm run build:signed -- --profile YOUR_PROFILE
```

To select another `tizen` executable:

```sh
npm run build:signed -- --profile YOUR_PROFILE --tizen /path/to/tizen
```

The automated signer requires a directly executable CLI file. On Windows, run `tizen.bat` from a Tizen Studio terminal or PowerShell. First run `npm run build` to stage both apps, then package each project as follows. Adjust the CLI path and profile to your installation.

```powershell
# PowerShell from the repository root
Push-Location build/web/writer
& 'C:\tizen-studio\tools\ide\bin\tizen.bat' package -t wgt -s YOUR_PROFILE -- .
Pop-Location
Push-Location build/web/reader
& 'C:\tizen-studio\tools\ide\bin\tizen.bat' package -t wgt -s YOUR_PROFILE -- .
Pop-Location
```

Check for each package in its project directory. On Windows, install Python 3.9 or later and verify that `python3` is on PATH. This PowerShell and SDK signing procedure was not run in the verification environment.

The signing script creates fresh app staging directories and runs `tizen package -t wgt -s YOUR_PROFILE -- .` from each project directory. Samsung's CLI example packages a directory containing `config.xml` and web files this way. The script verifies that each newly created WGT contains author and distributor signature metadata before copying it into `dist/signed/`. It does not reuse `dist/unsigned/` or stale output. Keep signed installation packages local; do not upload them as public CI artifacts. [Samsung CLI packaging example](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/building-curl-applications-using-cli-tools.html)

`--profile` selects the Tizen CLI security profile name. If the CLI cannot find it, check its registration in Certificate Manager. Without the Tizen Studio/TV SDK and certificate profile, the signed build should fail. It must not silently fall back to an unsigned package and call it installable.

## Connect and install on a TV

Connect the TV and computer to the same network, then run:

```sh
sdb connect TV_IP
sdb devices
tizen install -s SERIAL --name KmKeyWriter.wgt -- dist/signed
tizen install -s SERIAL --name KmKeyReader.wgt -- dist/signed
tizen run -s SERIAL -p KmWriter01.Writer
tizen run -s SERIAL -p KmReader01.Reader
```

If the SDK creates different WGT file names, use the names present in `dist/signed/`. Updating an app with an existing app ID may follow a different path from the first install. Check the TV's saved state before uninstalling an app or resetting data. Successful install and launch commands do not establish that KeyManager sharing or get works. Run the physical-device checks in the [test plan](GUIDE.md#physical-device-test-plan), T03–T12.

## Outputs and publication

- `dist/unsigned/`: unsigned automated review outputs. Git ignores this directory.
- `dist/signed/`: local installation packages. Git and CI ignore this directory.
- SDK certificates, keys, and profile files: private files that must stay out of this repository.
- Public GitHub CI: runs `npm test`, creates unsigned WGTs, and stores the two WGTs and their SHA-256 manifest. It does not sign with the Samsung SDK or install to a TV.
