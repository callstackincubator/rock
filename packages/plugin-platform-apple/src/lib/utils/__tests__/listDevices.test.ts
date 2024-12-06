import spawn from 'nano-spawn';
import fs from 'node:fs';
import { listDevicesAndSimulators } from '../listDevices.js';
import { Mock, vi } from 'vitest';

vi.mock('nano-spawn');
vi.mock('node:fs');

beforeEach(() => {
  (spawn as Mock)
    .mockResolvedValueOnce({ output: xcrunSimctlOutput })
    .mockResolvedValueOnce({ output: devicectlOutput });

  vi.mocked(fs).readFileSync.mockReturnValue(devicectlOutput);
});

const devicectlOutput = `
{
  "info" : {
    "arguments" : [
      "devicectl",
      "list",
      "devices",
      "-j",
      "./tmp.json"
    ],
    "commandType" : "devicectl.list.devices",
    "environment" : {
      "TERM" : "xterm-256color"
    },
    "jsonVersion" : 2,
    "outcome" : "success",
    "version" : "397.21"
  },
  "result" : {
    "devices" : [
      {
        "capabilities" : [
          {
            "featureIdentifier" : "com.apple.coredevice.feature.unpairdevice",
            "name" : "Unpair Device"
          }
        ],
        "connectionProperties" : {
          "authenticationType" : "manualPairing",
          "isMobileDeviceOnly" : false,
          "lastConnectionDate" : "2024-07-19T19:07:40.777Z",
          "pairingState" : "paired",
          "potentialHostnames" : [
            "00008112-000C18C00C41A01E.coredevice.local",
            "3574FE69-1FBC-4320-9B68-6B21B329CF4E.coredevice.local"
          ],
          "tunnelState" : "unavailable"
        },
        "deviceProperties" : {
          "bootedFromSnapshot" : true,
          "bootedSnapshotName" : "com.apple.os.update-B85E7A526BAA709A717F05DFCE553E04A25314E75507FA8B1BC0388CA5060AD5",
          "ddiServicesAvailable" : false,
          "developerModeStatus" : "enabled",
          "hasInternalOSBuild" : false,
          "name" : "Apple Vision Pro",
          "osBuildUpdate" : "21O589",
          "osVersionNumber" : "1.2",
          "rootFileSystemIsWritable" : false
        },
        "hardwareProperties" : {
          "cpuType" : {
            "name" : "arm64e",
            "subType" : 2,
            "type" : 16777228
          },
          "deviceType" : "realityDevice",
          "ecid" : 3404912838942750,
          "hardwareModel" : "N301AP",
          "internalStorageCapacity" : 256000000000,
          "isProductionFused" : true,
          "marketingName" : "Apple Vision Pro",
          "platform" : "xrOS",
          "productType" : "RealityDevice14,1",
          "reality" : "physical",
          "serialNumber" : "TJ45F0V6HY",
          "supportedCPUTypes" : [
            {
              "name" : "arm64e",
              "subType" : 2,
              "type" : 16777228
            },
            {
              "name" : "arm64",
              "subType" : 0,
              "type" : 16777228
            },
            {
              "name" : "arm64",
              "subType" : 1,
              "type" : 16777228
            },
            {
              "name" : "arm64_32",
              "subType" : 1,
              "type" : 33554444
            }
          ],
          "supportedDeviceFamilies" : [
            1,
            2,
            7
          ],
          "thinningProductType" : "RealityDevice14,1",
          "udid" : "00008112-000C18C00C41A01E"
        },
        "identifier" : "3574FE69-1FBC-4320-9B68-6B21B329CF4E",
        "tags" : [

        ],
        "visibilityClass" : "default"
      },
      {
        "capabilities" : [
          {
            "featureIdentifier" : "com.apple.coredevice.feature.installroot",
            "name" : "Install Root"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.installapp",
            "name" : "Install Application"
          },
          {
            "featureIdentifier" : "com.apple.dt.profile",
            "name" : "Service Hub Profile"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.debugserverproxy",
            "name" : "com.apple.internal.dt.remote.debugproxy"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.uninstallroot",
            "name" : "Uninstall Root"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.fetchappicons",
            "name" : "Fetch Application Icons"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.disableddiservices",
            "name" : "Disable Developer Disk Image Services"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.unpairdevice",
            "name" : "Unpair Device"
          },
          {
            "featureIdentifier" : "Cryptex1",
            "name" : "com.apple.security.cryptexd.remote"
          },
          {
            "featureIdentifier" : "ReadIdentifiers",
            "name" : "com.apple.security.cryptexd.remote"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.listapps",
            "name" : "List Applications"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.transferFiles",
            "name" : "Transfer Files"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.spawnexecutable",
            "name" : "Spawn Executable"
          },
          {
            "featureIdentifier" : "CryptexInstall",
            "name" : "com.apple.security.cryptexd.remote"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.listprocesses",
            "name" : "List Processes"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.querymobilegestalt",
            "name" : "Query MobileGestalt"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.listroots",
            "name" : "List Roots"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.getlockstate",
            "name" : "Get Lock State"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.sendmemorywarningtoprocess",
            "name" : "Send Memory Warning to Process"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.acquireusageassertion",
            "name" : "Acquire Usage Assertion"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.rebootdevice",
            "name" : "Reboot Device"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.viewdevicescreen",
            "name" : "View Device Screen"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.capturesysdiagnose",
            "name" : "Capture Sysdiagnose"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.fetchddimetadata",
            "name" : "Fetch Developer Disk Image Services Metadata"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.getdisplayinfo",
            "name" : "Get Display Information"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.launchapplication",
            "name" : "Launch Application"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.monitorprocesstermination",
            "name" : "Monitor Process for Termination"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.uninstallapp",
            "name" : "Uninstall Application"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.sendsignaltoprocess",
            "name" : "Send Signal to Process"
          },
          {
            "featureIdentifier" : "Cryptex1,UseProductClass",
            "name" : "com.apple.security.cryptexd.remote"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.disconnectdevice",
            "name" : "Disconnect from Device"
          },
          {
            "featureIdentifier" : "com.apple.dt.remoteFetchSymbols.dyldSharedCacheFiles",
            "name" : "com.apple.dt.remoteFetchSymbols"
          },
          {
            "featureIdentifier" : "com.apple.coredevice.feature.getdeviceinfo",
            "name" : "Fetch Extended Device Info"
          }
        ],
        "connectionProperties" : {
          "authenticationType" : "manualPairing",
          "isMobileDeviceOnly" : false,
          "lastConnectionDate" : "2024-12-06T16:55:38.466Z",
          "localHostnames" : [
            "my-iphone.coredevice.local",
            "00008110-00015D4E1439801E.coredevice.local",
            "6DEA7AA0-E7CE-4C2F-8706-43464FA2910D.coredevice.local"
          ],
          "pairingState" : "paired",
          "potentialHostnames" : [
            "00008110-00015D4E1439801E.coredevice.local",
            "6DEA7AA0-E7CE-4C2F-8706-43464FA2910D.coredevice.local"
          ],
          "transportType" : "wired",
          "tunnelIPAddress" : "fdff:c3b9:12b0::1",
          "tunnelState" : "connected",
          "tunnelTransportProtocol" : "tcp"
        },
        "deviceProperties" : {
          "bootState" : "booted",
          "bootedFromSnapshot" : true,
          "bootedSnapshotName" : "com.apple.os.update-027C9D77AFE10465E45B92DDB1AD85D8F116B64C443515AE9667312B17B3FFBC",
          "ddiServicesAvailable" : true,
          "developerModeStatus" : "enabled",
          "hasInternalOSBuild" : false,
          "name" : "my-iphone",
          "osBuildUpdate" : "22B91",
          "osVersionNumber" : "18.1.1",
          "rootFileSystemIsWritable" : false,
          "screenViewingURL" : "devices://device/open?id=6DEA7AA0-E7CE-4C2F-8706-43464FA2910D"
        },
        "hardwareProperties" : {
          "cpuType" : {
            "name" : "arm64e",
            "subType" : 2,
            "type" : 16777228
          },
          "deviceType" : "iPhone",
          "ecid" : 384064904855582,
          "hardwareModel" : "D63AP",
          "internalStorageCapacity" : 128000000000,
          "isProductionFused" : true,
          "marketingName" : "iPhone 13 Pro",
          "platform" : "iOS",
          "productType" : "iPhone14,2",
          "reality" : "physical",
          "serialNumber" : "TXH6V2HLJQ",
          "supportedCPUTypes" : [
            {
              "name" : "arm64e",
              "subType" : 2,
              "type" : 16777228
            },
            {
              "name" : "arm64",
              "subType" : 0,
              "type" : 16777228
            },
            {
              "name" : "arm64",
              "subType" : 1,
              "type" : 16777228
            },
            {
              "name" : "arm64_32",
              "subType" : 1,
              "type" : 33554444
            }
          ],
          "supportedDeviceFamilies" : [
            1
          ],
          "thinningProductType" : "iPhone14,2",
          "udid" : "00008110-00015D4E1439801E"
        },
        "identifier" : "6DEA7AA0-E7CE-4C2F-8706-43464FA2910D",
        "tags" : [

        ],
        "visibilityClass" : "default"
      }
    ]
  }
}
`;

const xcrunSimctlOutput = `
== Devices ==
-- iOS 18.0 --
    iPhone SE (3rd generation) (3339B733-4E3C-4916-AF02-1C43E1C769B2) (Shutdown)
    iPhone 16 Pro (8E64D38C-2345-434D-AD46-DF092B4E2FDB) (Booted)
    iPhone 16 Pro Max (848948C1-8494-4331-B7DE-FB380E30B310) (Shutdown)
    iPhone 16 (DAF2A92E-0762-4443-9A1F-B06CAC58216D) (Shutdown)
    iPhone 16 Plus (2F1CFD88-6581-4425-9902-F452EF2CB5A1) (Shutdown)
    iPad (10th generation) (371F39BD-DFB4-41C8-A9BD-90527EED67E2) (Shutdown)
    iPad mini (6th generation) (229FF073-6A31-4F03-85D0-4D5DE02192E2) (Shutdown)
    iPad Air 13-inch (M2) (386C48E3-EAB5-47CA-9EA8-AD3A2A4AAB7F) (Shutdown)
    iPad Pro 13-inch (M4) (0C80D473-0072-4932-9C51-5E0ADB7ACE06) (Shutdown)
-- tvOS 18.0 --
    Apple TV (EF1F361A-F7B7-4859-BF4F-877BAF4836F2) (Shutdown)
    Apple TV 4K (3rd generation) (9D35F2F1-CA5B-4B17-8F7C-4D12308FB482) (Shutdown)
    Apple TV 4K (3rd generation) (at 1080p) (02A843C5-225C-456D-BFC1-F5B1F5565FDD) (Shutdown)
-- visionOS 1.1 --
-- visionOS 2.0 --
    Apple Vision Pro (8F741C32-632F-4E2F-B7D8-4CB8DDB8B888) (Shutdown)
-- Unavailable: com.apple.CoreSimulator.SimRuntime.iOS-15-2 --
-- Unavailable: com.apple.CoreSimulator.SimRuntime.iOS-15-4 --
`;

describe('listDevices', () => {
  it('outputs a list of available devices and simulators', async () => {
    const devices = await listDevicesAndSimulators();
    expect(devices).toEqual([
      {
        name: 'iPhone SE (3rd generation)',
        udid: '3339B733-4E3C-4916-AF02-1C43E1C769B2',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'iPhone 16 Pro',
        udid: '8E64D38C-2345-434D-AD46-DF092B4E2FDB',
        version: 'iOS 18.0',
        state: 'Booted',
        type: 'simulator',
      },
      {
        name: 'iPhone 16 Pro Max',
        udid: '848948C1-8494-4331-B7DE-FB380E30B310',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'iPhone 16',
        udid: 'DAF2A92E-0762-4443-9A1F-B06CAC58216D',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'iPhone 16 Plus',
        udid: '2F1CFD88-6581-4425-9902-F452EF2CB5A1',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'iPad (10th generation)',
        udid: '371F39BD-DFB4-41C8-A9BD-90527EED67E2',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'iPad mini (6th generation)',
        udid: '229FF073-6A31-4F03-85D0-4D5DE02192E2',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'iPad Air 13-inch (M2)',
        udid: '386C48E3-EAB5-47CA-9EA8-AD3A2A4AAB7F',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'iPad Pro 13-inch (M4)',
        udid: '0C80D473-0072-4932-9C51-5E0ADB7ACE06',
        version: 'iOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'Apple TV',
        udid: 'EF1F361A-F7B7-4859-BF4F-877BAF4836F2',
        version: 'tvOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'Apple TV 4K (3rd generation)',
        udid: '9D35F2F1-CA5B-4B17-8F7C-4D12308FB482',
        version: 'tvOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'Apple TV 4K (3rd generation) (at 1080p)',
        udid: '02A843C5-225C-456D-BFC1-F5B1F5565FDD',
        version: 'tvOS 18.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'Apple Vision Pro',
        udid: '8F741C32-632F-4E2F-B7D8-4CB8DDB8B888',
        version: 'visionOS 2.0',
        state: 'Shutdown',
        type: 'simulator',
      },
      {
        name: 'Apple Vision Pro',
        udid: '00008112-000C18C00C41A01E',
        version: 'xrOS 1.2',
        state: 'Shutdown',
        type: 'device',
      },
      {
        name: 'my-iphone',
        udid: '00008110-00015D4E1439801E',
        version: 'iOS 18.1.1',
        state: 'Booted',
        type: 'device',
      },
    ]);
  });
});
