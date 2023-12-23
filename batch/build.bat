@echo off
setlocal EnableDelayedExpansion

if "%1"=="debug" (
    set BUILD_TYPE=debug
) else if "%1"=="release" (
    set BUILD_TYPE=release
) else (
    echo invalid build type "%1". Exiting...
    goto :eof
)

@REM ---------------------------------------------------------------------------------------

echo:
echo compiling cpp ...
xmake f -p windows -a x64 -m %BUILD_TYPE%
xmake -w
if !errorlevel! neq 0 (
   echo Build failed with error !errorlevel!. Exiting... 
   goto :eof
)
echo xmake success

@REM ---------------------------------------------------------------------------------------

echo:
echo run app ...
echo ---------------------------------------------------------------------------------------
echo:

@REM run the application
@REM /b means to stay in the command line below, 
@REM /wait blocks the terminal to wait for the application to exit
start /wait /b /d "build/windows/x64/%BUILD_TYPE%" main.exe
