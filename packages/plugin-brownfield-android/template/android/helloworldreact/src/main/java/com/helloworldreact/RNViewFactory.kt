package com.helloworldreact

import android.content.Context
import android.os.Bundle
import android.widget.FrameLayout
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView

object RNViewFactory {
    fun createFrameLayout(
        context: Context,
        params: Bundle? = null,
    ): FrameLayout {
        val reactView = ReactRootView(context)
        val reactNativeHost = ReactNativeHostManager.shared.getReactNativeHost()
        val instanceManager: ReactInstanceManager? = reactNativeHost?.reactInstanceManager
        reactView.startReactApplication(
            instanceManager,
            "HelloWorld",
            params,
        )
        return reactView
    }
}