set_project("vulkan test")

set_arch("x64")
set_warnings("all")
set_languages("c++20")
set_toolchains("clang")

add_rules("mode.debug", "mode.release")
add_rules("plugin.compile_commands.autoupdate", {outputdir = ".vscode"})

target("main")
    -- recursivelly add all cpp files in src, to make compile units
    add_files("src/**.cpp")
    add_includedirs(
        "src"
    )

    add_links( 
    "User32", 
    "Gdi32", 
    "shell32",
    "msvcrt"
    )
