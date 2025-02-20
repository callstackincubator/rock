package com.helloworldreact

import android.app.Application
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.PackageList
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class ReactNativeHostManager {
    companion object {
        val shared: ReactNativeHostManager by lazy { ReactNativeHostManager() }
        private var reactNativeHost: ReactNativeHost? = null
    }

    fun getReactNativeHost(): ReactNativeHost? {
        return reactNativeHost
    }

    fun initialize(
        application: Application,
    ) {
        if (reactNativeHost == null) {
            SoLoader.init(application, OpenSourceMergedSoMapping)
            reactNativeHost =
                object : DefaultReactNativeHost(application) {
                    override fun getUseDeveloperSupport(): Boolean {
                        return BuildConfig.DEBUG
                    }

                    override fun getPackages(): MutableList<ReactPackage> {
                        val packages: MutableList<ReactPackage> = PackageList(application).packages
                        return packages
                    }

                    override fun getJSMainModuleName(): String {
                        return "index"
                    }

                    override fun getBundleAssetName(): String {
                        return "index.android.bundle"
                    }

                    override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
                    override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
                }
        }
    }
}
