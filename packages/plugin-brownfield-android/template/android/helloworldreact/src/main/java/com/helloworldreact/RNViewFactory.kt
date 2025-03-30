package com.helloworldreact

import android.content.Context
import android.os.Bundle
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.ReactDelegate
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView

object RNViewFactory {
    fun createFrameLayout(
        context: Context,
        activity: FragmentActivity,
        initialParams: Bundle? = null,
    ): FrameLayout {
        val componentName = "HelloWorld"
        val reactHost = ReactNativeHostManager.shared.getReactHost()

        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            val reactDelegate = ReactDelegate(activity, reactHost!!, componentName, initialParams)
            val lifecycleObserver = getLifeCycleObserver(reactDelegate)

            activity.lifecycle.addObserver(lifecycleObserver)
            reactDelegate.loadApp()
            return reactDelegate.reactRootView as FrameLayout
        }

        val instanceManager: ReactInstanceManager? = ReactNativeHostManager.shared.getReactNativeHost()?.reactInstanceManager
        val reactView = ReactRootView(context)
        reactView.startReactApplication(
            instanceManager,
            componentName,
            initialParams,
        )
        return reactView
    }

    private fun getLifeCycleObserver(reactDelegate: ReactDelegate): DefaultLifecycleObserver {
        return object : DefaultLifecycleObserver {
            override fun onResume(owner: LifecycleOwner) {
                reactDelegate.onHostResume()
            }

            override fun onPause(owner: LifecycleOwner) {
                reactDelegate.onHostPause()
            }

            override fun onDestroy(owner: LifecycleOwner) {
                reactDelegate.onHostDestroy()
                owner.lifecycle.removeObserver(this)
            }
        }
    }
}