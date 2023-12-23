#include "Application.hpp"

#include "utils/Coor.hpp"

#include <iostream>

Application::Application() { std::cout << "Application constructor" << std::endl; }

Application::~Application() { std::cout << "Application destructor" << std::endl; }