# Configuring the App for Brownfield Distribution

RNEF is able to build all the React Native code and bundle them into a single consumable file. This file is a `.xcframework` file for Apple platforms and `.aar` file for Android.

To be able to set this up, follow these steps:

## iOS

### 1. New Framework Target in the Xcode Workspace:

a. Open `ios/<project_name>.xcworkspace` using Xcode
b. Add a new target and pick the `Framework` template
    ![Framework Target](./docs/assets/brownfield_framework_target.png) 
c. Make sure to give the library a distinct name. This name will be used when you import the library in native apps.
d. Right click to the generated framework folder and pick `Convert to Group`. Cocoapods doesn't work properly with references at the moment.
    ![The menu that appears when user right clicks on the generated framework folder](./docs/assets/brownfield_convert_to_group.png)
e. Apply the following build settings:

    | Build Setting                   | Value | Description                                                                                                                                                                                                      |
    |---------------------------------|-------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
    | Build Libraries for Distibution | YES   | This generates a module interface for you from your swift module. Also the swift compiler will throw if you try to consume the xcframework with an older version of xcode.                                       |
    | User Script Sandboxing          | NO    | Xcode normally sandboxes the scripts so you cannot modify files. We need this to be disabled to generate the js bundle later on                                                                                  |
    | Skip Install                    | NO    | This tells Xcode to not to generate any products. We obviously need to disable this to build our framework(s)                                                                                                    |
    | Enable Module Verifier          | NO    | When Xcode generates your framework artifacts, it tests it against a simple project to see if it can get compiled. Although useful, this adds some time to the compilation process. We can skip this altogether. |

### 2. Cocoapods Dependencies

a. Add the new framework target to `ios/Podfile` with `inherit!`:
    ```ruby
    target '<project_name>' do
      #...

      # Add the following lines
      target '<framework_target_name>' do
        inherit! :complete
      end

      # ...
      post_install do |installer|
    end
    ```
b. Go to `ios/` and run `pod install`

### 3. Framework's Public API

a. Create a new swift file in the generated framework folder
b. You can copy the template from `path/to/template`

### 4. Generating the Framework Artifact

a. Generate the framework artifact using the `rnef` cli:
    ```sh
    rnef build:ios --package --scheme <framework_target_name> --buildFolder "./rnef-build" 
    ```

---

## Android

__TBD__

