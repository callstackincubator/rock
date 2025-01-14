# iOS CI builds

## Simulator

Simulator build results in `*.app` *directory* (aka macOS "package"). This requires GitHub artifact to be first packed as tarball, before being uploaded as artifact. 

Simulator builds do not require signing.

## Device

Device build results in `*.ipa` *file*.

### Provisioning Profile

Build that are to be run on a device must be signed with a Development or Distribution provisioning profile. Develoment profile allows for installing on a device through Xcode and is intened for development purposes.

Provisioning Profile, which can be tough as Certificate + App ID, describes which on which way the app is installed on a device, and what devices are allowed to install it. There are following types of profiles:

- Development
  - created with Development certificate
  - allows for installing on a device through Xcode
- App Store
  - created with Distribution certificate
  - allows for installing on a device through App Store/Test Flight
- Ad-Hoc
  - created with Distribution certificate
  - allows for installing on devices registered with given Apple Developer account and specified in the profile
  - used for internal testing or small scale distribution
- Enterprise
  - created with Distribution certificate
  - technically allows for installing on any device, but legally restricted to enterprise employees
  - this type of profile can be created only with Apple Enterprise Developer account
  - used for internal distribution & testing

### Certificate

Certifcate can also be either Development or Distribution. Development certificate allows for installing on a device through Xcode and is intened for development purposes. Distribution certificate allows for installing on a device through App Store/Test Flight, etc.

Certificate has a public and private part. Public part can be generally downloaded from Apple Developer portal, while private part is stored on a developer's machine and needs to be distributed separately (e.g. to other developers or CI).

In order to generate an *.ipa file, a developer needs to put both public and private parts of the certificate on the CI.

#### Installing Apple Certificates on GitHub Actions

https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development

A modern alternative to Distribution certificate is "Distributed Managed" certificate, which is a managed certificate for which private part is stored on Apple's servers and Apple is actually handling the signing operation.


