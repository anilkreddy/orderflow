FROM gradle:9.5.0-jdk25 AS builder

WORKDIR /home/gradle/project

COPY --chown=gradle:gradle . .

RUN gradle :customer-service:bootJar --no-daemon

FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=builder /home/gradle/project/customer-service/build/libs/*.jar app.jar

EXPOSE 8085

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
