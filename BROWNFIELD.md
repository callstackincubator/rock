# Configuring the App for Brownfield Distribution

RNEF is able to build all the React Native code and bundle them into a single consumable file. This file is a `.xcframework` file for Apple platforms and `.aar` file for Android.

To be able to set this up, follow these steps:

## iOS

TBD

<hr/>

## Android

<details>
<summary>Step 1 - brownfield module</summary>
<br/>
In this step, we will create a new android library module within our React-Native project, which will embed the UI we develop in React-Native and exposes the APIs related to loading React-Native UI into a native android app. 
    
Let’s open our React-Native android folder in Android Studio and create a new android library:
    
- Go to File → New Module → Android Library
        
    ![Verify Aar plugin setup](./docs/assets/android-brownfield/create_module.png)
        
- Once the sync finishes, run your RN app to make sure nothing cashes.
- Let’s also try to generate the release AAR of both `app` and `rnbrownfield` module by running `./gradlew assembleRelease` in android directory, to make sure everything works at this stage.
</details>

<details>
<summary>Step 2 - setup fat AAR gradle plugin</summary>
<br/>

We are now required to leverage a gradle plugin to generate a fat AAR from our `rnbrownfield` module. This gradle plugin is an inspiration from already available OSS plugins for generating a fat AAR.
    
- We will use https://github.com/callstack/big-fat-aar to help us generate a fat AAR. There’s a latest published version [here](https://github.com/callstack/big-fat-aar/packages/2290113), which we will consume.
- Add the following code to your `android/build.gradle` and `rnbrownfield/build.gradle` files:
    
    ```diff
    diff --git a/android/build.gradle b/android/build.gradle
    index a62d6da..6e38d66 100644
    --- a/android/build.gradle
    +++ b/android/build.gradle
    @@ -8,6 +8,14 @@ buildscript {
             kotlinVersion = "2.0.21"
         }
         repositories {
    +        maven {
    +            name = "GitHubPackages"
    +            url = uri("https://maven.pkg.github.com/callstack/big-fat-aar")
    +            credentials {
    +                username = System.getenv("GITHUB_USERNAME")
    +                password = System.getenv("GITHUB_TOKEN")
    +            }
    +        }
             google()
             mavenCentral()
         }
    @@ -15,6 +23,7 @@ buildscript {
             classpath("com.android.tools.build:gradle")
             classpath("com.facebook.react:react-native-gradle-plugin")
             classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
    +        classpath("org.bigfataar:plugin:0.0.3")
         }
     }
     
    diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
    index 6b51bb3..ba19363 100644
    --- a/android/rnbrownfield/build.gradle.kts
    +++ b/android/rnbrownfield/build.gradle.kts
    @@ -1,6 +1,7 @@
     plugins {
         id("com.android.library")
         id("org.jetbrains.kotlin.android")
    +    id("org.bigfataar.plugin")
     }
     
     android {
    
    ```
    
- Since we are consuming packages from private Github packages, you’ll need to provide your Github creds from ENV or you can add manually.
- Run `./gradlew assembleRelease` to verify nothing crashes. You should see the following logs in your terminal and it should end with success.
        
    ![Verify Aar plugin setup](./docs/assets/android-brownfield/verify_aar_plugin_setup.png)
        
</details>


<details>
<summary>Step 3 - add hermes and react-android</summary>
<br/>

We will now add `hermes-android` and `react-android` to the dependencies of `rnbrownfield` . These dependencies are required to provide the react-native and hermes implementation details for our brownfield module. 

- Add the following code to `rnbrownfield/build.gradle`

```diff
diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index ba19363..cf53ff2 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -35,6 +35,9 @@ android {
 
 dependencies {
 
+    api("com.facebook.react:react-android:0.77.0")
+    api("com.facebook.react:hermes-android:0.77.0")
+
     implementation("androidx.core:core-ktx:1.15.0")
     implementation("androidx.appcompat:appcompat:1.7.0")
     implementation("com.google.android.material:material:1.12.0")

```

- Sync your project and run `./gradlew assembleRelease` to make sure everything works.

</details>

<details>
<summary>Step 4 - add ReactNativeHostManager</summary>
<br/>

Here we are going to add the code required to load react-native application and expose it as a function.

- Add a file called `ReactNativeHostManager.kt` in `rnbrownfield` module then add the following code to it:

```kt
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
```

- Add the following diff to `rnbrownfield/build.gradle.kts` for using java 17:

```diff
diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index cf53ff2..003fcd6 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -25,11 +25,11 @@ android {
         }
     }
     compileOptions {
-        sourceCompatibility = JavaVersion.VERSION_1_8
-        targetCompatibility = JavaVersion.VERSION_1_8
+        sourceCompatibility = JavaVersion.VERSION_17
+        targetCompatibility = JavaVersion.VERSION_17
     }
     kotlinOptions {
-        jvmTarget = "1.8"
+        jvmTarget = "17"
     }
 }
```

- Add the following diff to set `buildConfigField`:

```diff
diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index cf53ff2..0be2ef5 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -22,14 +22,16 @@ android {
                 getDefaultProguardFile("proguard-android-optimize.txt"),
                 "proguard-rules.pro"
             )
+            buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", properties["newArchEnabled"].toString())
+            buildConfigField("boolean", "IS_HERMES_ENABLED", properties["hermesEnabled"].toString())
         }
     }
 }
 ```

 - Finally, add the following diff to `rnbrownfield/build.gradle`:

 ```diff

diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index 0be2ef5..94d1a3a 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -4,6 +4,11 @@ plugins {
     id("org.bigfataar.plugin")
 }
 
+val appProject = project(":app")
+val appBuildDir: Directory = appProject.layout.buildDirectory.get()
+val moduleBuildDir: Directory = layout.buildDirectory.get()
+val autolinkingJavaSources = "generated/autolinking/src/main/java"
+
 android {
     namespace = "com.callstack.rnbrownfield"
     compileSdk = 34
@@ -33,6 +38,11 @@ android {
     kotlinOptions {
         jvmTarget = "17"
     }
+    sourceSets {
+        getByName("main") {
+            java.srcDirs("$moduleBuildDir/$autolinkingJavaSources")
+        }
+    }
 }
 
 dependencies {
@@ -46,4 +56,14 @@ dependencies {
     testImplementation("junit:junit:4.13.2")
     androidTestImplementation("androidx.test.ext:junit:1.2.1")
     androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
+}
+
+tasks.register<Copy>("copyAutolinkingSources") {
+    dependsOn(":app:generateAutolinkingPackageList")
+    from("$appBuildDir/$autolinkingJavaSources")
+    into("$moduleBuildDir/$autolinkingJavaSources")
+}
+
+tasks.named("preBuild").configure{
+    dependsOn("copyAutolinkingSources")
 }
 ```

 - Run `./gradlew assembleRelease` to make sure everything works
</details>

<details>
<summary>Step 5 - include JS Bundle</summary>
<br/>

Here we need to configure our gradle setup in a way that when we are generating the Aar, our JS bundle is included inside of it. To achieve it, we will add dependency on the RNGP task that generates the JS bundle for our `app` module. Add the following diff:

```diff
diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index 1eeffc0..a54f1a0 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -41,6 +41,8 @@ android {
     }
     sourceSets {
         getByName("main") {
+            assets.srcDirs("$appBuildDir/generated/assets/createBundleReleaseJsAndAssets")
             java.srcDirs("$moduleBuildDir/$autolinkingJavaSources")
         }
     }
@@ -97,4 +99,11 @@ tasks.register<Copy>("copyAutolinkingSources") {
 
 tasks.named("preBuild").configure{
     dependsOn("copyAutolinkingSources")
+    val buildType = when {
+        gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = true) } -> "Release"
+        else -> "Debug"
+    }
+    if (buildType == "Release") {
+        dependsOn(":app:createBundleReleaseJsAndAssets")
+    }
 }
\ No newline at end of file

```
</details>

<details>
<summary>Step 6 - expose RN entry point</summary>
<br/>

In this step, we will expose a RN entry point in a way which is consumable by the native android app. We will wrap our RN UI in a `FrameLayout` so the Android app can render it easily.

Let’s start off by creating a new file called `RNViewFactory` and add the following code to it:

```kt
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
            "BrownfieldTest",
            params,
        )
        return reactView
    }
}
```
</details>

<details>
<summary>Step 7 - publish to local Maven</summary>
<br/>

To publish a AAR to local maven, we can leverage a plugin called `maven-publish` . Let’s add the following code to include this plugin and sync:

```diff
diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index 94d1a3a..6daca0b 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -2,6 +2,7 @@ plugins {
     id("com.android.library")
     id("org.jetbrains.kotlin.android")
     id("org.bigfataar.plugin")
+    `maven-publish`
 }
 
 val appProject = project(":app")

```

Now, we need to configure publishing to local maven. Add the following code:

```diff
diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index 94d1a3a..8fe74e0 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -58,6 +59,36 @@ dependencies {
     androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
 }
 
+publishing {
+    publications {
+        create<MavenPublication>("mavenAar") {
+            groupId = "com.callstack"
+            artifactId = "rnbrownfield"
+            version = "0.0.1-local"
+            artifact("$moduleBuildDir/outputs/aar/rnbrownfield-release.aar")
+
+            pom {
+                withXml {
+                    asNode().appendNode("dependencies").apply {
+                        configurations.getByName("api").allDependencies.forEach { dependency ->
+                            appendNode("dependency").apply {
+                                appendNode("groupId", dependency.group)
+                                appendNode("artifactId", dependency.name)
+                                appendNode("version", dependency.version)
+                                appendNode("scope", "compile")
+                            }
+                        }
+                    }
+                }
+            }
+        }
+    }
+
+    repositories {
+        mavenLocal() // Publishes to the local Maven repository (~/.m2/repository by default)
+    }
+}
+
 tasks.register<Copy>("copyAutolinkingSources") {
     dependsOn(":app:generateAutolinkingPackageList")
     from("$appBuildDir/$autolinkingJavaSources")

```

Next, we need to leverage `rnef` to generate `aar`:

1. Add `@rnef/plugin-brownfield-android` as a dependency
2. Register the brownfield plugin in `rnef.config.mjs`

   ```js
   // rnef.config.mjs
   // ...
   import { pluginBrownfieldAndroid } from '@rnef/plugin-brownfield-android';

   export default {
     plugins: [
       // ...
       pluginBrownfieldAndroid(),
     ],
     // ...
   };
   ```

1. Generate the framework artifact using the `rnef` cli. Add the following to your `package.json` and run with your package manager like `pnpm publish-aar` or `yarn publish-aar`:

   ```.json
   "package:aar": "rnef package:aar --variant Release --module-name rnbrownfield",
   "publish-aar": "pnpm package:aar && rnef publish-local:aar --module-name rnbrownfield"
   ```

</details>


<details>
<summary>Step 8 - consume AAR in android App</summary>
<br/>

>Here, a pre-requisite is having either an existing android app, otherwise create a fresh one in Android Studio. We will follow these steps on a fresh android app.

To consume the AAR from local maven, we will need to add `mavenLocal` for providing the source to find our package in:
    
    ```diff
    diff --git a/app/build.gradle.kts b/app/build.gradle.kts
    index 303f665..1ef398f 100644
    --- a/app/build.gradle.kts
    +++ b/app/build.gradle.kts
    @@ -36,6 +36,7 @@ android {
     }
     
     dependencies {
    	+    implementation("com.callstack:rnbrownfield:0.0.1-local")
     
         implementation(libs.androidx.core.ktx)
         implementation(libs.androidx.appcompat)
    diff --git a/settings.gradle.kts b/settings.gradle.kts
    index f9fab39..085e143 100644
    --- a/settings.gradle.kts
    +++ b/settings.gradle.kts
    @@ -14,6 +14,7 @@ pluginManagement {
     dependencyResolutionManagement {
         repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
         repositories {
    +        mavenLocal()
             google()
             mavenCentral()
         }
    
    ```
    
Perform, sync and run the App to make sure everything works at this step. Next, we are going to initialize the react-native host manager in `MainActivity` :
    
    ```diff
    diff --git a/app/src/main/java/com/hurali/androidapp/MainActivity.kt b/app/src/main/java/com/hurali/androidapp/MainActivity.kt
    index 40d7f35..4888bcc 100644
    --- a/app/src/main/java/com/hurali/androidapp/MainActivity.kt
    +++ b/app/src/main/java/com/hurali/androidapp/MainActivity.kt
    @@ -5,6 +5,7 @@ import androidx.activity.enableEdgeToEdge
     import androidx.appcompat.app.AppCompatActivity
     import androidx.core.view.ViewCompat
     import androidx.core.view.WindowInsetsCompat
    +import com.callstack.rnbrownfield.ReactNativeHostManager
     
     class MainActivity : AppCompatActivity() {
         override fun onCreate(savedInstanceState: Bundle?) {
    @@ -16,5 +17,6 @@ class MainActivity : AppCompatActivity() {
                 v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
                 insets
             }
    +        ReactNativeHostManager.shared.initialize(this.application)
         }
     }
    \ No newline at end of file
    ```
    
At this stage, run your app to make sure all is working. Next, we will add a `Fragment` to host our react-native UI. We will press on a button and present this fragment.

</details>


<details>
<summary>Step 9 - present RN UI in fragment</summary>
<br/>

We will start off by creating a `Fragment` called `RNAppFragment` and add the following code to it:

```kotlin
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.callstack.rnbrownfield.RNViewFactory

class RNAppFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? =
        this.context?.let {
            RNViewFactory.createFrameLayout(it)
        }
}
```

We now have to show this fragment. For this, let’s first add a button in `layout_main` :

```xml
    <Button
        android:id="@+id/show_rn_app_btn"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Show RN App"
        app:layout_constraintBottom_toBottomOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintTop_toTopOf="parent" />
```

Next, we will add a `onClickListener` to this button and show the fragment:

```diff
diff --git a/app/src/main/java/com/hurali/androidapp/MainActivity.kt b/app/src/main/java/com/hurali/androidapp/MainActivity.kt
index 4888bcc..4a54182 100644
--- a/app/src/main/java/com/hurali/androidapp/MainActivity.kt
+++ b/app/src/main/java/com/hurali/androidapp/MainActivity.kt
@@ -1,6 +1,7 @@
 package com.hurali.androidapp
 
 import android.os.Bundle
+import android.widget.Button
 import androidx.activity.enableEdgeToEdge
 import androidx.appcompat.app.AppCompatActivity
 import androidx.core.view.ViewCompat
@@ -8,6 +9,8 @@ import androidx.core.view.WindowInsetsCompat
 import com.callstack.rnbrownfield.ReactNativeHostManager
 
 class MainActivity : AppCompatActivity() {
+    private lateinit var showRNAppBtn: Button
+
     override fun onCreate(savedInstanceState: Bundle?) {
         super.onCreate(savedInstanceState)
         enableEdgeToEdge()
@@ -18,5 +21,13 @@ class MainActivity : AppCompatActivity() {
             insets
         }
         ReactNativeHostManager.shared.initialize(this.application)
+
+        showRNAppBtn = findViewById(R.id.show_rn_app_btn)
+        showRNAppBtn.setOnClickListener {
+            supportFragmentManager
+                .beginTransaction()
+                .replace(R.id.fragmentContainer, RNAppFragment())
+                .commit()
+        }
     }
 }
\ No newline at end of file

```

We'll need to add a placeholder container for attaching our fragment. Let’s add the following code:

```diff
diff --git a/app/src/main/res/layout/activity_main.xml b/app/src/main/res/layout/activity_main.xml
index 35db350..9c615eb 100644
--- a/app/src/main/res/layout/activity_main.xml
+++ b/app/src/main/res/layout/activity_main.xml
@@ -17,4 +17,8 @@
         app:layout_constraintStart_toStartOf="parent"
         app:layout_constraintTop_toTopOf="parent" />
 
+    <FrameLayout
+        android:id="@+id/fragmentContainer"
+        android:layout_width="match_parent"
+        android:layout_height="match_parent" />
 </androidx.constraintlayout.widget.ConstraintLayout>
\ No newline at end of file

```

Everything is setup for us now and it’s time to test. Run the app and see all works fine.

</details>