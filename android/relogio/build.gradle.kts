plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// O app do relógio (Galaxy Watch 4 em diante, e outros com Wear OS 3+).
// O applicationId é o MESMO do app do celular e a chave também: o Wear OS só
// deixa os dois conversarem (Data Layer) assim. São dois APKs, um para cada
// aparelho.
android {
    namespace = "br.com.treinolivre.relogio"
    compileSdk = 36

    defaultConfig {
        applicationId = "br.com.treinolivre.app"
        minSdk = 30
        targetSdk = 34
        versionCode = (System.getenv("TL_VERSAO_CODIGO") ?: "1").toInt()
        versionName = System.getenv("TL_VERSAO_NOME") ?: "1.0"
    }

    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("TL_KEYSTORE") ?: "../app/treinolivre.jks")
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
    implementation("com.google.android.gms:play-services-wearable:19.0.0")
}
