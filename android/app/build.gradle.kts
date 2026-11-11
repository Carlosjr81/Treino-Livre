plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "br.com.treinolivre.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "br.com.treinolivre.app"
        minSdk = 29
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

    // Duas versões do mesmo app. "direto": o APK do GitHub, que instala o app do
    // relógio pelo Wi-Fi (InstaladorRelogio em src/direto). "loja": o pacote da
    // Play Store, que não pode instalar app por fora da loja; ali o mesmo botão
    // abre a Play Store no relógio (src/loja).
    flavorDimensions += "canal"
    productFlavors {
        create("direto") { dimension = "canal" }
        create("loja") { dimension = "canal" }
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
    packaging {
        resources { excludes += listOf("/META-INF/{AL2.0,LGPL2.1}", "/META-INF/versions/9/OSGI-INF/MANIFEST.MF") }
    }
}

dependencies {
    implementation("androidx.health.connect:connect-client:1.1.0")
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
    implementation("androidx.browser:browser:1.8.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    // o relógio (Galaxy Watch, Wear OS): os toques e o painel, pelo Bluetooth
    implementation("com.google.android.gms:play-services-wearable:19.0.0")
    // o play-services traz um androidx.fragment antigo (1.1), e o lint barra o
    // registerForActivityResult com ele
    implementation("androidx.fragment:fragment-ktx:1.8.5")
    // abrir a tela do Treino Livre no relógio quando o treino começa no celular
    implementation("androidx.wear:wear-remote-interactions:1.1.0")
    // o RemoteActivityHelper devolve um ListenableFuture: o artefato pequeno
    // dele perde para a versão vazia que outras bibliotecas pedem
    implementation("com.google.guava:guava:33.3.1-android")
    // o instalador do app do relógio (InstaladorRelogio): o ADB por Wi-Fi.
    // libadb-android pela licença Apache-2.0; ela traz a spake2-java (LGPL-3.0,
    // sem modificação), exceção decidida com o dono em 2026-11-11 (ver LICENSE)
    "diretoImplementation"("com.github.MuntashirAkon:libadb-android:3.1.1")
    "diretoImplementation"("org.conscrypt:conscrypt-android:2.5.3")
    "diretoImplementation"("org.bouncycastle:bcpkix-jdk15to18:1.81")
    // a câmera dos óculos Ray-Ban Meta (kit da Meta, Maven Central)
    implementation("com.meta.wearable:mwdat-core:1.0.1")
    implementation("com.meta.wearable:mwdat-camera:1.0.1")
}
