FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/SchoolAdmission.Api/*.csproj src/SchoolAdmission.Api/
RUN dotnet restore src/SchoolAdmission.Api
COPY src/SchoolAdmission.Api src/SchoolAdmission.Api
RUN dotnet publish src/SchoolAdmission.Api -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]