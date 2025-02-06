internal import React
internal import React_RCTAppDelegate
import UIKit

public enum ReactNativeManagerError: Error {
    case javaScriptBundleNotFound
}

/// The main entry point for loading React Native views
@objcMembers public class HelloWorldReactNativeManager {
    private let rootViewFactory: RCTRootViewFactory

    public init() throws(ReactNativeManagerError) {
        guard let jsBundleURL = Self.getJavaScriptBundleURL() else {
            throw .javaScriptBundleNotFound
        }

        let rootViewFactoryConfiguration = RCTRootViewFactoryConfiguration(
            bundleURL: jsBundleURL,
            newArchEnabled: RCTIsNewArchEnabled()
        )

        rootViewFactory = RCTRootViewFactory(configuration: rootViewFactoryConfiguration)
    }

    /// Loads a React Native view with the given module name.
    ///
    /// React components are registered as modules by using the [AppRegistry](https://reactnative.dev/docs/appregistry) API.
    /// - Parameter moduleName: Name used while registering the React Component with the `AppRegistry` API.
    /// - Parameter initialProps: Props that are going to be passed to the React Component.
    /// - Parameter launchOptions: The options app was launched with. This is usually obtained from the app delagate. This is mainly used for deep linking.
    public func loadView(
        moduleName: String, initialProps: [AnyHashable: Any]?,
        launchOptions: [AnyHashable: Any]?
    ) -> UIView {
        rootViewFactory.view(
            withModuleName: moduleName, initialProperties: initialProps,
            launchOptions: launchOptions
        )
    }
}

extension HelloWorldReactNativeManager {
    private static func getJavaScriptBundleURL() -> URL? {
        #if DEBUG
            // Get the JavaScript bundle from the packager.
            // Fallback to offline JS bundle if the packager is not running.
            RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
            // Get the JavaScript bundle from the current framework bundle.
            Bundle(for: Self.self).url(forResource: "main", withExtension: "jsbundle")!
        #endif
    }
}
