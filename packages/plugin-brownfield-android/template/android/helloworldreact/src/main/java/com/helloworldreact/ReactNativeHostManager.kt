package com.helloworldreact

import android.app.Application
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class ReactNativeHostManager {
    companion object {
        val shared: ReactNativeHostManager by lazy { ReactNativeHostManager() }
        private var reactNativeHost: ReactNativeHost? = null
        private var reactHost: ReactHost? = null
    }

    fun getReactNativeHost(): ReactNativeHost? {
        return reactNativeHost
    }

    fun getReactHost(): ReactHost? {
        return reactHost
    }

    fun initialize(application: Application) {
        if (reactNativeHost != null && reactHost != null) {
            return
        }

        SoLoader.init(application, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load()
        }

        val reactApp = object : ReactApplication {
            override val reactNativeHost: ReactNativeHost =
                object : DefaultReactNativeHost(application) {
                    override fun getPackages(): MutableList<ReactPackage> {
                        return PackageList(application).packages
                    }

                    override fun getJSMainModuleName(): String = "index"
                    override fun getBundleAssetName(): String = "index.android.bundle"

                    override fun getUseDeveloperSupport() = BuildConfig.DEBUG

                    override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
                    override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
                }

            override val reactHost: ReactHost
                get() = getDefaultReactHost(application, reactNativeHost)
        }

        reactNativeHost = reactApp.reactNativeHost
        reactHost = reactApp.reactHost
    }
}
