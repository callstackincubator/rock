import groovy.json.JsonOutput
import groovy.json.JsonSlurper

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.callstack.react.brownfield")
    `maven-publish`
    id("com.facebook.react")
}

react {
    autolinkLibrariesWithApp()
}

repositories {
    mavenCentral()
}

val appProject = project(":app")
val appBuildDir: Directory = appProject.layout.buildDirectory.get()
val moduleBuildDir: Directory = layout.buildDirectory.get()
val autolinkingJavaSources = "generated/autolinking/src/main/java"

android {
    namespace = "com.helloworldreact"
    compileSdk = 34

    defaultConfig {
        minSdk = 24

        buildConfigField("boolean", "IS_NEW_ARCHITECTURE_ENABLED", properties["newArchEnabled"].toString())
        buildConfigField("boolean", "IS_HERMES_ENABLED", properties["hermesEnabled"].toString())
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        getByName("main") {
            assets.srcDirs("$appBuildDir/generated/assets/createBundleReleaseJsAndAssets")
            res.srcDirs("$appBuildDir/generated/res/createBundleReleaseJsAndAssets")
            java.srcDirs("$moduleBuildDir/$autolinkingJavaSources")
        }
        getByName("release") {
            jniLibs.srcDirs("libsRelease")
        }
        getByName("debug") {
            jniLibs.srcDirs("libsDebug")
        }
    }
    publishing {
        multipleVariants {
            allVariants()
        }
    }
}

publishing {
    publications {
        create<MavenPublication>("mavenAar") {
            groupId = "com.helloworldreact"
            artifactId = "helloworld"
            version = "0.0.1-local"
            afterEvaluate {
                from(components.getByName("default"))
            }

            pom {
                withXml {
                    //removing RN dependencies like e.g. react-native-svg 
                    //added by "from(components.getByName("default"))" to pom file
                    val dependenciesNode = (asNode().get("dependencies") as groovy.util.NodeList).first() as groovy.util.Node
                    dependenciesNode.children()
                        .filterIsInstance<groovy.util.Node>()
                        .filter { (it.get("groupId") as groovy.util.NodeList).text() == rootProject.name }
                        .forEach { dependenciesNode.remove(it) }
                }
            }
        }
    }

    repositories {
        mavenLocal() // Publishes to the local Maven repository (~/.m2/repository)
    }
}

dependencies {
    api("com.facebook.react:react-android:0.78.0")
    api("com.facebook.react:hermes-android:0.78.0")
}

tasks.register<Copy>("copyAutolinkingSources") {
    dependsOn(":app:generateAutolinkingPackageList")
    from("$appBuildDir/$autolinkingJavaSources")
    into("$moduleBuildDir/$autolinkingJavaSources")
}

androidComponents {
    onVariants { variant ->
        val buildType = variant.buildType?.replaceFirstChar { it.titlecase() }

        tasks.register<Copy>("copy${buildType}LibSources") {
            dependsOn(":app:generateCodegenSchemaFromJavaScript")
            dependsOn(":app:strip${buildType}DebugSymbols")

            dependsOn(":helloworldreact:generateCodegenSchemaFromJavaScript")
            from("${appBuildDir}/intermediates/stripped_native_libs/${buildType?.lowercase()}/strip${buildType}DebugSymbols/out/lib")
            into("${rootProject.projectDir}/helloworldreact/libs${buildType}")

            include("**/libappmodules.so", "**/libreact_codegen_*.so")
        }

        tasks.named("preBuild").configure {
            dependsOn("copyAutolinkingSources")
            dependsOn("copy${buildType}LibSources")
            if (buildType == "Release") {
                dependsOn(":app:createBundleReleaseJsAndAssets")
            }
        }
    }
}

//removing RN dependencies like e.g. react-native-svg 
//added by "from(components.getByName("default"))" to "module" file
tasks.register("removeDependenciesFromModuleFile") {
    doLast {
        file("$moduleBuildDir/publications/mavenAar/module.json").run {
            val json = inputStream().use { JsonSlurper().parse(it) as Map<String, Any> }
            (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                (variant["dependencies"] as? MutableList<Map<String, Any>>)?.removeAll { it["group"] == rootProject.name }
            }
            writer().use { it.write(JsonOutput.prettyPrint(JsonOutput.toJson(json))) }
        }
    }
}

tasks.named("generateMetadataFileForMavenAarPublication") {
   finalizedBy("removeDependenciesFromModuleFile")
}