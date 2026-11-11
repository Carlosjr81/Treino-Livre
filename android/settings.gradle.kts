pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        // a libadb-android e a spake2 (o instalador do app do relógio) só estão no JitPack
        maven("https://jitpack.io")
    }
}
rootProject.name = "TreinoLivre"
include(":app")
// o app do relógio (Galaxy Watch, Wear OS): mesmo nome de pacote e mesma chave do
// app do celular, que é o que o Wear OS exige para os dois conversarem
include(":relogio")
