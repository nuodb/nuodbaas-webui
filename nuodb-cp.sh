#!/bin/bash

function checkError() {
    RC=$?
    if [ $RC -ne 0 ] ; then
        echo "ERROR: $1, RC=$RC"
        exit $RC
    fi
}

function addRepo() {
    if [ "`helm repo list | grep -e "^nuodb-cp"`" == "" ] ; then
        echo "Adding Helm repo nuodb-cp"
        helm repo add nuodb-cp https://nuodb.github.io/nuodb-cp-releases/charts
        checkError "unable to add helm repo nuodb-cp"
    fi
}

function deleteRepo() {
    if [ "`helm repo list | grep -e "^nuodb-cp"`" != "" ] ; then
        echo "Deleting Helm repo nuodb-cp"
        helm repo remove nuodb-cp
        checkError "unable to delete helm repo nuodb-cp"
    fi
}

function helmInstall() {
    if [ "`helm list | grep -e "^$1"`" == "" ] ; then
        echo "Installing helm chart nuodb-cp/$1"
	    helm install --wait "$1" "nuodb-cp/$1"
        checkError "unable to install helm chart nuodb-cp/$1"
    fi
}

function helmUninstall() {
    if [ "`helm list -a | grep -e "^$1"`" != "" ] ; then
        echo "Uninstalling helm chart $1"
	    helm delete "$1"
        checkError "unable to delete helm chart $1"
    fi
}

function installTunnel() {
    if [ "`ps -ef | grep -e "kubectl port-forward service/nuodb-cp-rest 8080:8080" | grep -v -e grep`" == "" ] ; then
        echo "Installing Tunnel"
	    kubectl port-forward service/nuodb-cp-rest 8080:8080 &
    fi
}

function uninstallTunnel() {
    PID="`ps -ef | grep -e "kubectl port-forward service/nuodb-cp-rest 8080:8080" | grep -v -e grep | awk ' { print $2 }'`"
    if [ "$PID" != "" ] ; then
        echo "Uninstalling Tunnel"
	    kill -9 $PID
    fi
}

if [ "$1" = "install" ] ; then
    addRepo
    helmInstall nuodb-cp-crd
    helmInstall nuodb-cp-operator
    helmInstall nuodb-cp-rest
    installTunnel
elif [ "$1" = "uninstall" ] ; then
    uninstallTunnel
    helmUninstall nuodb-cp-rest
    helmUninstall nuodb-cp-operator
    helmUninstall nuodb-cp-crd
    deleteRepo
else
    echo "$0 install"
    echo "$0 uninstall"
    exit 1
fi
