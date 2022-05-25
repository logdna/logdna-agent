def TRIGGER_PATTERN = ".*@logdnabot.*"
def PROJECT_NAME = "logdna-agent"

pipeline {
  agent {label 'ec2-fleet'}

  options {
    timestamps()
    ansiColor 'xterm'
  }

  triggers {
    issueCommentTrigger(TRIGGER_PATTERN)
  }

  environment {
    NPM_CONFIG_CACHE = '.npm'
    NPM_CONFIG_USERCONFIG = '.npmrc'
    SPAWN_WRAP_SHIM_ROOT = '.npm'
  }

  stages {
    stage('Test Suite') {
      matrix {
        axes {
          axis {
            name 'NODE_VERSION'
            values '14', '16'
          }
        }

        when {
          not {
            changelog '\\[skip ci\\]'
          }
        }


        agent {
          docker {
            image "us.gcr.io/logdna-k8s/node:${NODE_VERSION}-ci"
            customWorkspace "${PROJECT_NAME}-${BUILD_NUMBER}"
          }
        }

        stages {
          stage('Install') {
            steps {
              sh "mkdir -p ${NPM_CONFIG_CACHE} coverage"
              sh 'npm install'
            }
          }

          stage('Test') {
            steps {
              sh 'npm test'
            }

            post {
              always {
                publishHTML target: [
                  allowMissing: false,
                  alwaysLinkToLastBuild: false,
                  keepAll: true,
                  reportDir: 'coverage/lcov-report',
                  reportFiles: 'index.html',
                  reportName: "coverage-node-v${NODE_VERSION}"
                ]
              }
            }
          }
        }
      }
    }

  }
}
