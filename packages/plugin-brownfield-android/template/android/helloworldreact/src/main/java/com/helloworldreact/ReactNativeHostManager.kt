package com.helloworldreact

import android.app.Application
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

object ReactNativeHostManager {
    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        loadReactNative(application)

        val packageList = PackageList(application).packages
        ReactNativeBrownfield.initialize(application, packageList, onJSBundleLoaded)
    }
}
