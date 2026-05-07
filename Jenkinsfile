pipeline {
    agent any

    environment {
        IMAGE_NAME = 'chandanvura/devops-frontend'
        IMAGE_TAG  = "v${BUILD_NUMBER}"
        KUBECONFIG = 'C:\\ProgramData\\Jenkins\\.jenkins\\.kube\\config'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Cloning frontend...'
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building frontend image...'
                bat 'docker build -t %IMAGE_NAME%:%IMAGE_TAG% .'
            }
        }

        stage('Trivy Security Scan') {
            steps {
                echo 'Scanning frontend image...'
                bat 'C:\\Windows\\System32\\trivy.exe image --exit-code 0 --severity LOW,MEDIUM,HIGH,CRITICAL --format table %IMAGE_NAME%:%IMAGE_TAG%'
            }
        }

        stage('Push to DockerHub') {
            steps {
                echo 'Pushing to DockerHub...'
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    bat 'docker login -u %DOCKER_USER% -p %DOCKER_PASS%'
                    bat 'docker push %IMAGE_NAME%:%IMAGE_TAG%'
                }
            }
        }

        stage('Deploy via Helm') {
            steps {
                echo 'Deploying frontend...'
                bat 'helm upgrade --install frontend-app helm-chart/ --set image.tag=%IMAGE_TAG% --kubeconfig=%KUBECONFIG%'
            }
        }
    }

    post {
        always {
            bat 'C:\\Windows\\System32\\trivy.exe image --exit-code 0 --severity HIGH,CRITICAL --format json --output trivy-report.json %IMAGE_NAME%:%IMAGE_TAG% || exit 0'
        }
        success { echo 'Frontend deployed successfully!' }
        failure { echo 'Frontend pipeline failed!' }
    }
}