plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.com.treinolivre.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "br.com.treinolivre.app"
        minSdk = 26
        targetSdk = 35
        // o número de cada build do GitHub Actions: cada APK novo é uma versão maior
        versionCode = (System.getenv("TL_VERSAO_CODIGO") ?: "1").toInt()
        versionName = System.getenv("TL_VERSAO_NOME") ?: "1.0"
    }

    // A chave vem do ambiente (o segredo do GitHub, ou uma gerada no Actions).
    // Nunca fica no repositório.
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("TL_KEYSTORE") ?: "treinolivre.jks")
            storePassword = System.getenv("TL_STORE_PASS") ?: ""
            keyAlias = System.getenv("TL_KEY_ALIAS") ?: "treinolivre"
            keyPassword = System.getenv("TL_KEY_PASS") ?: System.getenv("TL_STORE_PASS") ?: ""
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
    implementation("androidx.browser:browser:1.8.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
}
